// Public site key only. Secret key belongs in the Worker, never in VITE_*.
let loading: Promise<void> | undefined;
function api(): any { return (window as any).turnstile; }
function load(): Promise<void> {
  if (api()) return Promise.resolve();
  if (!loading) loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true; script.onload = () => resolve(); script.onerror = () => {
      script.remove(); loading = undefined; reject(new Error('Bot check unavailable'));
    };
    document.head.appendChild(script);
  });
  return loading;
}
export function attachTurnstile(form: HTMLFormElement, sitekey: string) {
 let widget: string | undefined, token = '', disposed = false;
 const mount = document.createElement('div');
 form.querySelector('.sbm')!.before(mount);
 const start = document.createElement('button'); start.type = 'button';
 start.textContent = document.documentElement.lang === 'he' ? 'הפעלת בדיקת בוטים לצורך הבדיקה' : 'Start bot check for this test';
 start.style.cssText = 'padding:12px;min-height:44px;margin:8px 0'; mount.appendChild(start);
 start.addEventListener('click', () => { if (!sitekey) return; start.disabled = true; load().then(() => {
  if(disposed) return;
  widget=api().render(mount,{sitekey, action:'ccw_form', size:'flexible',callback:(value:string)=>{token=value;},'expired-callback':()=>{token='';},'error-callback':()=>{token='';}});
 }).catch(()=>{token='';start.disabled=false;}); });
 return {
  token:()=>token,
  reset:()=>{token='';if(widget!==undefined)api()?.reset(widget);},
  dispose:()=>{disposed=true;if(widget!==undefined)api()?.remove(widget);mount.remove();}
 };
}
