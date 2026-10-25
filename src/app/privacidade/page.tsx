import {legalStatus,privacy} from '@/content/legal';
import {privacyProviderLinks,privacyRetentionLinks} from '@/content/privacy-links';
export default function Privacy(){return <><p className="member-kicker">Privacidade · 25/10/2026</p><h1>Seus dados, com <em>clareza.</em></h1><p className="member-message">{legalStatus}</p>{privacy.map((article,index)=>{
  const links=index===3?privacyProviderLinks:index===4?privacyRetentionLinks:[];
  return <section className="member-card" key={article.title}><h2>{article.title}</h2><p>{article.text}</p>
    {links.length>0&&<ul className="privacy-links">{links.map(link=><li key={link.href}><a className="legal-link" href={link.href} target="_blank" rel="noopener noreferrer">{link.label} (abre em nova aba)</a></li>)}</ul>}
  </section>;
})}</>;}
