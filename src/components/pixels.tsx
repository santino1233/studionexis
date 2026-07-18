import { appsOf } from "@/lib/webhooks";

// Studio ad pixels & analytics on public pages (Wave 15 A3) — render-once
// script tags. Each vendor's standard install snippet, driven by the studio's
// saved ID. IDs are sanitised before interpolation.
export function Pixels({ policies }: { policies: unknown }) {
  const p = appsOf(policies).pixels;
  if (!p || !(p.ga4 || p.meta || p.tiktok || p.clarity || p.gtm || p.pinterest || p.snapchat)) return null;
  const esc = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "");
  return (
    <>
      {p.ga4 && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(p.ga4)}`} />
          <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(p.ga4)}');` }} />
        </>
      )}
      {p.gtm && (
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${esc(p.gtm)}');` }} />
      )}
      {p.meta && (
        <script dangerouslySetInnerHTML={{ __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(p.meta)}');fbq('track','PageView');` }} />
      )}
      {p.tiktok && (
        <script dangerouslySetInnerHTML={{ __html: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n='https://analytics.tiktok.com/i18n/pixel/events.js';ttq._i=ttq._i||{};ttq._i[e]=[];ttq._t=ttq._t||{};ttq._t[e]=+new Date;var o=d.createElement('script');o.async=!0;o.src=n+'?sdkid='+e+'&lib='+t;var a=d.getElementsByTagName('script')[0];a.parentNode.insertBefore(o,a)}(window,document,'ttq');ttq.load('${esc(p.tiktok)}');ttq.page();` }} />
      )}
      {p.clarity && (
        <script dangerouslySetInnerHTML={{ __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${esc(p.clarity)}");` }} />
      )}
      {p.pinterest && (
        <script dangerouslySetInnerHTML={{ __html: `!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");pintrk('load','${esc(p.pinterest)}');pintrk('page');` }} />
      )}
      {p.snapchat && (
        <script dangerouslySetInnerHTML={{ __html: `(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u)})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','${esc(p.snapchat)}');snaptr('track','PAGE_VIEW');` }} />
      )}
    </>
  );
}
