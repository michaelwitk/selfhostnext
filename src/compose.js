import { ensureFile, readdir, readFile, writeFile } from 'fs-extra'

import { exec } from './libs/exec'

export const docker_version = async () => {
  let { stdout } = await exec(`docker version --format json`)
  stdout = JSON.parse(stdout)
  // stdout.Version
  return stdout
}

export const dotenv_example = async () => {
  await ensureFile(`./.env`)
  await ensureFile(`./.env.example`)

  let dotenv = await readFile(`./.env`, 'utf8')
  let split = dotenv.split('\n')

  let dotenv_example = await readFile(`./.env.example`, 'utf8')
  let missing = dotenv_example.split('\n')
  missing = missing.filter((line) => {
    const [key] = line.split('=')
    let found = split.some((line) => line.startsWith(`${key}=`))
    if (found) return

    return true
  })

  let prev = [...split]
  if (missing.length > 0)
    prev = [...prev, `# BeFast added missed variables:`, ...missing]

  prev = prev.join('\n')
  await writeFile(`./.env`, prev, 'utf8')
}

export const docker_compose_up = async (up) => {
  let files = await readdir('compose')
  console.log(files)
  files = files.filter(
    (file) => file.endsWith('.yml') || file.endsWith('.yaml')
  )
  for (let _file of files) {
    console.log(_file)
    let file = `compose/${_file}`
    let file_env = `./.env`
    await docker_compose(file, file_env, up)
  }
}

export const docker_network_create = async (name) => {
  console.log('here1')
  try {
    await exec(`docker network create ${name}`)
  } catch (error) {
    console.error(error)
    console.error('error.stderr')
    console.error(error.stderr)

    // if(error)
  }
  //  if (stderr.stderr.startsWith(`Error: Command failed: docker network create`))

  console.log('here2')
}

let default_docker_network = `befast-compose-shared`
export const docker_compose = async (file, file_env, up = 'up -d --wait') => {
  console.log({
    file,
    file_env,
    up,
  })
  await docker_network_create(default_docker_network)

  await exec(`docker compose -f ${file} --env-file ${file_env} ${up}`)
}