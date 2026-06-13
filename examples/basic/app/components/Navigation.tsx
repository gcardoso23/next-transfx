import { Link } from 'next-transfx'

export function Navigation() {
  return (
    <nav className="navigation">
      <Link className="navigation__mark" href="/">
        next-transfx
      </Link>

      <ul className="navigation__links">
        <li>
          <Link href="/work">Work</Link>
        </li>
        <li>
          <Link href="/about">About</Link>
        </li>
      </ul>
    </nav>
  )
}
