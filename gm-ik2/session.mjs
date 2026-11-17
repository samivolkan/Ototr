// Reuse the ERP session gate in hosted environments. Local synthetic QA is offline.
if (['localhost','127.0.0.1','[::1]'].includes(location.hostname)) {
 document.documentElement.classList.remove('ototr-access-locked');
} else {
 import('../saha-satis/erp-access.js?v=erp-session-2').catch(() => {
  document.documentElement.classList.add('ototr-access-locked');
  document.documentElement.dataset.accessError='Oturum denetlenemedi. Sayfayı yenileyin.';
 });
}
