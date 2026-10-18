"""Package only Git-tracked source. Run after committing a reviewed release."""
import argparse
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent


def main():
    args=argparse.ArgumentParser(description=__doc__)
    args.add_argument('output',type=Path)
    output=args.parse_args().output.resolve()
    dirty=subprocess.check_output(['git','status','--porcelain','--','ruhsat-lab','ruhsat-erp.js','index.html'],cwd=ROOT).strip()
    if dirty:raise SystemExit('Commit the reviewed source before packaging.')
    paths=subprocess.check_output(['git','ls-files','-z','--','ruhsat-lab','ruhsat-erp.js','index.html'],cwd=ROOT).decode().split('\0')
    revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip()
    blocked={'runtime','test-results','private-data','uploads','documents','models','.venv','__pycache__'}
    files={}
    for name in filter(None,paths):
        path=Path(name)
        if blocked.intersection(path.parts) or (path.name.startswith('.env') and path.name!='.env.example'):
            raise SystemExit('Private/runtime file in Git; packaging refused.')
        if path.suffix.lower() in {'.jpg','.jpeg','.png','.webp','.heic','.heif','.pdf','.sqlite3','.db','.onnx','.zip'} and name!='ruhsat-lab/web/sample.png':
            raise SystemExit('Unexpected binary document in Git; packaging refused.')
        files[name]=(ROOT/path).read_bytes()
    manifest={'release':'0.3.0','git_commit':revision,'files':{k:hashlib.sha256(v).hexdigest() for k,v in files.items()},
              'models_included':False,'real_documents_included':False,'trained_model':False,
              'erp_note':'index.html and ruhsat-erp.js are integration references; full ERP assets remain in the Git repository.'}
    output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,'x',compression=zipfile.ZIP_DEFLATED) as archive:
        for name,data in files.items():archive.writestr(name,data)
        archive.writestr('MANIFEST.json',json.dumps(manifest,indent=2))
    digest=hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix('.sha256').write_text(digest+'  '+output.name+'\n',encoding='ascii')
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        for name,digest in manifest['files'].items():
            assert hashlib.sha256(archive.read(name)).hexdigest()==digest
    print(f'Verified {len(files)} source files and archive checksums.')


if __name__=='__main__':main()
