import type { Metadata } from 'next';
import './members.css';
export const metadata:Metadata={title:{default:'Área exclusiva | HM Presença & Performance',template:'%s | HM'},
  robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR"><head><link rel="stylesheet" href="/assets/css/styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400&family=Jost:wght@300;400;500;600&display=swap" />
  </head><body><a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <header className="landing-header"><a className="logo-lockup" href="/"><img src="/Fotos/Logo-transparente.png" width="88" height="61" alt="HM" /><span>presença <i>e</i> performance</span></a>
      <nav aria-label="Navegação principal"><a href="/">Início</a><a href="/membros">Biblioteca</a><a href="/conta">Minha conta</a><a href="/planos">Assinatura</a></nav></header>
    <main id="conteudo" className="member-main">{children}</main>
    <footer className="member-footer">HM Presença &amp; Performance · Um espaço para sua presença evoluir.<br /><a href="https://wa.me/5512992006109">Falar com a HM</a></footer>
  </body></html>;
}
