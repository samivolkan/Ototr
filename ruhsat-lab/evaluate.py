"""Offline evaluation. Private labels stay beside images; reports contain counts only.

This program does not train weights. A development example is not a held-out test.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import statistics
import time
import math
from pathlib import Path
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from ruhsat.feedback import VehicleKey
from ruhsat.parser import same_value
from ruhsat import __version__


class Case(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[a-z0-9_-]{1,40}$")
    document_group: str = Field(pattern=r"^[a-z0-9_-]{1,40}$")
    split: Literal["development", "train", "validation", "test"]
    condition: Literal["unknown", "clear", "blur", "glare", "skew", "small", "mixed"]
    image: str
    consent: Literal[True]
    label_review: Literal["assistant", "human"]
    synthetic: bool
    expected: dict[VehicleKey, str | None] = Field(min_length=1)


class Dataset(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal[1]
    cases: list[Case] = Field(min_length=1)

    @model_validator(mode="after")
    def splits(self):
        groups, ids = {}, set()
        for case in self.cases:
            if case.id in ids:
                raise ValueError("Duplicate case id")
            ids.add(case.id)
            if case.document_group in groups and groups[case.document_group] != case.split:
                raise ValueError("Same document group occurs in different splits")
            groups[case.document_group] = case.split
            if case.split != "development" and case.label_review != "human":
                raise ValueError("Train/validation/test labels require human review")
        return self


def load_dataset(path: Path):
    dataset = Dataset.model_validate_json(path.read_text(encoding="utf-8"))
    root = path.resolve().parent
    hashes, files = {}, {}
    for case in dataset.cases:
        target = (root / case.image).resolve()
        if not target.is_relative_to(root) or not target.is_file():
            raise ValueError("Image must be an existing file inside the dataset directory")
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        if digest in hashes and hashes[digest] != case.document_group:
            raise ValueError("Duplicate image assigned to different document groups")
        hashes[digest] = case.document_group
        files[case.id] = (target, digest)
    fingerprint = hashlib.sha256(json.dumps({"manifest":dataset.model_dump(),"images":{k:v[1] for k,v in files.items()}},sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    return dataset, files, fingerprint


def score_case(case, fields, seconds):
    actual = {f["key"]:f["value"] for f in fields}
    outcomes = []
    for key, expected in case.expected.items():
        value = actual.get(key)
        exact = value is None if expected is None else value is not None and same_value(value, expected)
        outcomes.append({"key":key,"exact":exact,"missing":expected is not None and not value,
                         "false_positive":expected is None and value is not None,"expected_present":expected is not None})
    return {"id":case.id,"group":case.document_group,"condition":case.condition,
            "synthetic":case.synthetic,"label_review":case.label_review,"seconds":seconds,"outcomes":outcomes}


def report(items, fingerprint, split, version):
    grouped = {}
    for item in items:
        for outcome in item["outcomes"]:
            key = (outcome["key"],item["condition"],item["synthetic"])
            row = grouped.setdefault(key,dict(key=key[0],condition=key[1],synthetic=key[2],count=0,exact=0,missing=0,false_positive=0))
            row["count"]+=1
            for metric in ("exact","missing","false_positive"):
                row[metric]+=int(outcome[metric])
    outcomes=[o for i in items for o in i["outcomes"]]
    return {"schema_version":1,"dataset_fingerprint":fingerprint,"split":split,"version":version,
            "settings":{"mode":"detailed","preprocessing":"standard","auto_rotate":True,"rectify":False},
            "documents":len({i["group"] for i in items}),"cases":items,
            "evaluated_fields":len(outcomes),"exact_fields":sum(o["exact"] for o in outcomes),
            "median_seconds":round(statistics.median([i["seconds"] for i in items]),2) if items else None,
            "by_field_condition":list(grouped.values()),"model_trained":False,
            "production_accuracy_claim":False}


def compare(before, after):
    for key in ("dataset_fingerprint","split","settings"):
        if before[key]!=after[key]:raise ValueError("Reports use different datasets or settings")
    if [c['id'] for c in before['cases']] != [c['id'] for c in after['cases']]:
        raise ValueError("Reports use different cases")
    regressions=[]
    for old,new in zip(before['cases'],after['cases']):
        old_fields={o['key']:o for o in old['outcomes']}
        for outcome in new['outcomes']:
            if old_fields[outcome['key']]['exact'] and not outcome['exact']:
                regressions.append({'id':new['id'],'key':outcome['key']})
    return {"before_exact":before['exact_fields'],"after_exact":after['exact_fields'],
            "evaluated_fields":after['evaluated_fields'],"regressions":regressions,
            "critical_regressions":[r for r in regressions if r['key'] in ('plate','vin')],
            "production_ready":False,"reason":"Independent representative human-reviewed test and operational validation required"}


def repeat_summary(samples, changed_fields, initialization_seconds):
    """Timing/consistency counts only; repeat runs never inflate accuracy."""
    durations=sorted(s['seconds'] for s in samples)
    per_case={}
    for sample in samples:
        per_case.setdefault(sample['id'],[]).append(sample['seconds'])
    return {'runs':len(samples),'initialization_seconds':round(initialization_seconds,3),
            'median_seconds':round(statistics.median(durations),3) if durations else None,
            'p95_seconds':round(durations[max(0,math.ceil(len(durations)*.95)-1)],3) if durations else None,
            'min_seconds':round(min(durations),3) if durations else None,
            'max_seconds':round(max(durations),3) if durations else None,
            'changed_field_observations':changed_fields,
            'per_case':[{'id':key,'runs':len(values),'median_seconds':round(statistics.median(values),3)} for key,values in per_case.items()],
            'samples':samples,'accuracy_counts_use_first_run_only':True}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest',type=Path)
    parser.add_argument('--split',choices=['development','train','validation','test'],default='test')
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--compare',type=Path)
    parser.add_argument('--repeats',type=int,choices=range(1,21),default=1,
                        help='Repeat all cases to measure speed and stability (1–20). Accuracy uses the first run only.')
    args=parser.parse_args()
    try:
        dataset,files,fingerprint=load_dataset(args.manifest)
        cases=[c for c in dataset.cases if c.split==args.split]
        if not cases:raise ValueError('Selected split is empty')
        from ruhsat.engine import OCRService
        service=OCRService();started=time.perf_counter();service.initialize()
        initialization_seconds=time.perf_counter()-started
        if service.status!='ready':raise ValueError('OCR model files unavailable')
        items=[];samples=[];first_values={};changed_fields=0
        for repeat in range(args.repeats):
            for number,case in enumerate(cases,1):
                raw=files[case.id][0].read_bytes()
                if hashlib.sha256(raw).hexdigest()!=files[case.id][1]:
                    raise ValueError('Dataset image changed during evaluation')
                result=service.analyze(raw,'detailed',0,False,True)
                current={f['key']:f['value'] for f in result['fields']}
                if repeat==0:
                    items.append(score_case(case,result['fields'],result['elapsed_seconds']))
                    first_values[case.id]=current
                else:
                    changed_fields+=sum(current.get(key)!=value for key,value in first_values[case.id].items())
                samples.append({'id':case.id,'repeat':repeat+1,'seconds':result['elapsed_seconds']})
                print(f"Completed round {repeat+1}/{args.repeats}, case {number}/{len(cases)}",flush=True)
        output=report(items,fingerprint,args.split,__version__)
        output['repeat_benchmark']=repeat_summary(samples,changed_fields,initialization_seconds)
        if args.compare:output['comparison']=compare(json.loads(args.compare.read_text()),output)
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding='utf-8')
    except Exception as exc:
        # Never echo Pydantic errors, private labels, filenames or document text.
        raise SystemExit('Evaluation stopped ('+type(exc).__name__+'). Check manifest schema, splits and model installation.') from None


if __name__=='__main__':main()
