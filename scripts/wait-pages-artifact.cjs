// Use the same artifact service as deploy-pages, not the separate REST index.
async function waitForPagesArtifact({ listArtifacts, artifactName, sleep, attempts = 12 }) {
  let previousId = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let response;
    try { response = await listArtifacts(); } catch { previousId = null; }
    const matches = (response?.artifacts || []).filter(a => a.name === artifactName);
    if (matches.length > 1) throw Error('Multiple matching Pages artifacts; deployment stopped.');
    const artifact = matches[0];
    if (artifact && Number.isSafeInteger(artifact.id) && artifact.id > 0 && artifact.size > 0) {
      if (artifact.id === previousId) return artifact;
      previousId = artifact.id;
    } else previousId = null;
    if (attempt + 1 < attempts) await sleep(5000);
  }
  throw Error('Pages artifact is not consistently visible to the deployment service.');
}
module.exports = { waitForPagesArtifact };
