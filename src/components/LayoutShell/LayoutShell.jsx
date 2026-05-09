import UtilityBar from '../UtilityBar/UtilityBar.jsx'
import Masthead from '../Masthead/Masthead.jsx'
import PrimaryNav from '../PrimaryNav/PrimaryNav.jsx'
import Footer from '../Footer/Footer.jsx'
import './LayoutShell.css'

/**
 * Public-route chrome wrapper. Composition order: UtilityBar → Masthead →
 * PrimaryNav → children → Footer. Admin routes bypass this in App.jsx.
 *
 * BandSwitcher is intentionally NOT rendered here per Designer §8.
 */
export default function LayoutShell({ children }) {
  return (
    <div className="bf-shell">
      <UtilityBar />
      <Masthead />
      <PrimaryNav />
      <div className="bf-shell-main">{children}</div>
      <Footer />
    </div>
  )
}
