import { Link } from 'next-transfx'

import { Rendered } from '../components/Rendered'
import { Title } from '../components/Title'

const sections = [
  {
    text: 'A link asks the page on screen to leave. Only when it has does the router hear of the navigation, so the page is never taken away half way through.',
    title: 'Leave',
  },
  {
    text: 'The next page is rendered on the server and put in the document. Nothing of it is painted before it is told to enter, so it can start from wherever it likes.',
    title: 'Enter',
  },
  {
    text: 'The back button changes the address before anything can be done about it. The page stays all the same, leaves as it would for a link, and the one before it comes in.',
    title: 'Back',
  },
  {
    text: 'Scroll down this page, follow the link at the end of it, and come back. It is where it was left, and it was put there before it came in.',
    title: 'Scroll',
  },
]

export default function About() {
  return (
    <>
      <Title>About</Title>

      {sections.map((section) => (
        <section className="section" key={section.title}>
          <h2>{section.title}</h2>
          <p className="lead">{section.text}</p>
        </section>
      ))}

      <Link className="link" href="/work">
        On to the work →
      </Link>

      <Rendered />
    </>
  )
}
