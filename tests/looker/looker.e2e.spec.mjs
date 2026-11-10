import {test,expect} from '@playwright/test';

async function session(request,role){
  const response=await request.get(`/__test__/session?role=${role}`);
  expect(response.ok()).toBeTruthy();
}

async function browserSession(page,role){
  await page.context().addCookies([{name:'ototr_test_role',value:role,url:'http://127.0.0.1:43821',sameSite:'Lax'}]);
}

test('CEO sees nine dashboards and opens mock CEO cockpit',async({page})=>{
  await browserSession(page,'CEO');
  await page.goto('/index.html#looker');
  await expect(page.getByRole('heading',{name:'Looker Canlı Yönetim Panoları'})).toBeVisible();
  await expect(page.locator('[data-looker-dashboard]')).toHaveCount(9);
  await page.getByRole('button',{name:/CEO Kokpiti/}).click();
  await expect(page.locator('[data-looker-status]')).toContainText('Genel merkez · Oturum hazır');
  const frame=page.frameLocator('[data-looker-frame]');
  await expect(frame.getByText('MOCK LOOKER · TEST ORTAMI')).toBeVisible();
  await expect(frame.locator('[data-test-scope]')).toHaveText('Genel merkez');
});

test('branch manager opens own branch dashboard',async({page})=>{
  await browserSession(page,'BRANCH_MANAGER');
  await page.goto('/index.html#looker');
  await page.getByRole('button',{name:/Şube Karnesi/}).click();
  const frame=page.frameLocator('[data-looker-frame]');
  await expect(frame.locator('[data-test-scope]')).toHaveText('Şube · Bursa Nilüfer');
});

test('branch manager is denied finance dashboard',async({request})=>{
  await session(request,'BRANCH_MANAGER');
  const response=await request.post('/api/looker/embed-url',{data:{dashboard:'finance'}});
  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toEqual({message:'Bu pano için yetkiniz yok.'});
});
