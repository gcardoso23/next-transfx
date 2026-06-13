import { Link } from 'next-transfx'

import { Rendered } from '../components/Rendered'
import { Title } from '../components/Title'
import { getProjects } from '../projects'

export default async function Work() {
  const projects = await getProjects()

  return (
    <>
      <Title>Work</Title>

      <ul className="projects">
        {projects.map((project, index) => (
          <li key={project.slug}>
            <Link className="projects__link" href={`/work/${project.slug}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span className="projects__title">{project.title}</span>
              <span>{project.year}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Rendered />
    </>
  )
}
