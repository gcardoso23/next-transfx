import { notFound } from 'next/navigation'
import { Link } from 'next-transfx'

import { Back } from '../../components/Back'
import { Rendered } from '../../components/Rendered'
import { Title } from '../../components/Title'
import { getProject } from '../../projects'

export default async function Project({ params }: PageProps<'/work/[slug]'>) {
  const { slug } = await params
  const result = await getProject(slug)

  if (!result) {
    notFound()
  }

  const { next, project } = result

  return (
    <>
      <Title>{project.title}</Title>

      <p className="lead">{project.description}</p>

      <dl className="details">
        <dt>Year</dt>
        <dd>{project.year}</dd>
        <dt>Discipline</dt>
        <dd>{project.discipline}</dd>
      </dl>

      <p className="actions">
        <Back />

        <Link className="link" href={`/work/${next.slug}`}>
          Next: {next.title} →
        </Link>
      </p>

      <Rendered />
    </>
  )
}
