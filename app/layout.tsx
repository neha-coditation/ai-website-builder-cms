import './style.css';
export const metadata={title:'Studio CMS | Website Builder',description:'Visual website builder starter'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
