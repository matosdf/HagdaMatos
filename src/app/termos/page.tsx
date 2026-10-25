import {legalStatus,terms} from '@/content/legal';
export default function Terms(){return <><p className="member-kicker">Termos da assinatura · 24/10/2026</p><h1>Termos de <em>uso.</em></h1><p className="member-message">{legalStatus}</p>{terms.map(article=><section className="member-card" key={article.title}><h2>{article.title}</h2><p>{article.text}</p></section>)}</>;}
