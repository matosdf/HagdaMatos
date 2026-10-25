import {legalStatus,privacy} from '@/content/legal';
export default function Privacy(){return <><p className="member-kicker">Privacidade · 24/10/2026</p><h1>Seus dados, com <em>clareza.</em></h1><p className="member-message">{legalStatus}</p>{privacy.map(article=><section className="member-card" key={article.title}><h2>{article.title}</h2><p>{article.text}</p></section>)}</>;}
