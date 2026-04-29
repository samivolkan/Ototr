(function(global){
  function normalizeRole(role){
    return String(role || "CEO").toUpperCase();
  }

  function getVisibleBranchIds(branches, role="CEO", regionId, branchId){
    const normalized = normalizeRole(role);
    if(normalized.includes("BAYI") || normalized.includes("SUBE") || normalized.includes("ŞUBE")){
      return new Set(branches.filter(x => (x.branchId || x.id) === branchId).map(x => x.branchId || x.id));
    }
    if(normalized.includes("BOLGE") || normalized.includes("BÖLGE")){
      return new Set(branches.filter(x => x.regionId === regionId || x.region === regionId).map(x => x.branchId || x.id));
    }
    return new Set(branches.map(x => x.branchId || x.id));
  }

  function filterRowsByRole(rows, branches, role="CEO", regionId, branchId){
    const visibleIds = getVisibleBranchIds(branches, role, regionId, branchId);
    return rows.filter(x => visibleIds.has(x.branchId || x.id));
  }

  const api = { getVisibleBranchIds, filterRowsByRole };
  global.OTOTR_PERMISSION_SERVICE = api;
  if(typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
