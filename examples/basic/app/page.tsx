import { Link } from 'next-transfx'

import { Rendered } from './components/Rendered'
import { Title } from './components/Title'

export default function Home() {
  return (
    <>
      <Title>Home</Title>

      <p className="lead">
        Every page here leaves before the next one is asked for, and the next one comes in once it is there. The back
        and forward buttons of the browser do the same.
      </p>

      <Link className="link" href="/work">
        See the work →
      </Link>

      <Rendered />
    </>
  )
}
