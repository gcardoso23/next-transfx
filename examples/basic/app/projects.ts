export type Project = {
  slug: string
  title: string
  year: number
  discipline: string
  description: string
}

const projects: Array<Project> = [
  {
    description: 'A tide table that reads like a poem, for a harbour town that still lives by the water.',
    discipline: 'Identity, Website',
    slug: 'low-tide',
    title: 'Low Tide',
    year: 2026,
  },
  {
    description: 'Wayfinding for a library that moved into a former power station, drawn from its switchboards.',
    discipline: 'Signage',
    slug: 'switchboard',
    title: 'Switchboard',
    year: 2025,
  },
  {
    description: 'An archive of field recordings, laid out by the hour of the day each one was made.',
    discipline: 'Website, Sound',
    slug: 'field-hours',
    title: 'Field Hours',
    year: 2025,
  },
  {
    description: 'A type specimen printed on the back of old sea charts, one sheet for each weight.',
    discipline: 'Print',
    slug: 'soundings',
    title: 'Soundings',
    year: 2024,
  },
]

// Stands for a request to a CMS, so that the page is not there at once.
const wait = () => new Promise((resolve) => setTimeout(resolve, 300))

export async function getProjects() {
  await wait()

  return projects
}

export async function getProject(slug: string) {
  await wait()

  const index = projects.findIndex((project) => project.slug === slug)
  const project = projects[index]

  if (!project) {
    return null
  }

  return { next: projects[(index + 1) % projects.length]!, project }
}
