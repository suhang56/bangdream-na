import './Footer.css'

export default function Footer({ communityName }) {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p className="footer-copy">
          {communityName} · {year}
        </p>
        <p className="footer-disclaimer">
          Fan community. Not affiliated with Bushiroad or Craft Egg.
        </p>
      </div>
    </footer>
  )
}
