#!/usr/bin/env node

import assert from 'assert'

import chalk from 'chalk'
import open from 'open'

import { config_read, config_write } from './config'
import { git_deploy, git_clone_befast } from './git'
import { docker_compose_up, dotenv_example } from './compose'

const assert_chalk = (condition, message) => {
  if (!condition) {
    console.log(chalk.red(message))
    process.exit(1)
  }
}

let host_trim = (host) => {
  host = host.replace(/^https?:\/\//, '')
  host = host.split('/')[0] // trailing
  return host
}

const main = async () => {
  let [_node, _path, ...args] = process.argv

  let [command, ...command_args] = args

  if (command === 'version' || command === 'v') {
    console.log(require('../package.json').version)
    process.exit(0)
  }

  let debug = process.env.DEBUG ?? ''
  debug = debug.split(',').includes('befast')

  if (debug)
    console.log({
      command,
      command_args,
    })

  config_read()
  if (debug) console.log(config_read())

  const { host, apikey } = config_read()

  if (command === 'cwd') {
    console.log(process.cwd())
    process.exit(0)
  }

  if (command === 'dotenv_example') {
    await dotenv_example()
    process.exit(0)
  }

  if (command === 'compose') {
    let [down] = command_args
    if (down !== 'down') down = undefined

    await dotenv_example()
    await docker_compose_up(down)
    process.exit(0)
  }

  if (command === 'domains') {
    let [action, domain, project] = command_args
    domain = host_trim(domain)

    assert_chalk(action === 'add', chalk.red(`Not yet implemented.`))
    assert_chalk(
      domain,
      domain`${chalk.red(`missing domain`)} ${chalk.cyan.bold(
        `befast domains add [domain] [project]`
      )}`
    )
    assert_chalk(
      project,
      `${chalk.red(`missing project`)} ${chalk.cyan.bold(
        `befast domains add [domain] [project]`
      )}`
    )

    let origin = `https://${host}`
    let res = await fetch(`${origin}/api/domains`, {
      method: 'POST',
      headers: {
        'x-apikey': apikey,
      },
      body: JSON.stringify({
        project,
        domain,
      }),
    })

    if (res.ok)
      console.log(
        `${chalk.gray.bold(domain)} ${chalk.gray('added successfully.')}`
      )
    else console.log(chalk.red('Something went wrong.'))

    process.exit(0)
  }
  if (command === 'login') {
    let [host, refresh] = command_args
    host = host_trim(host)

    let pathname

    assert_chalk(
      host,
      chalk.red(`Missing host. Run ${chalk.cyan.bold(`befast login [host]`)}`)
    )

    let origin = `https://${host}`
    if (!refresh) {
      let res = await fetch(`${origin}/api/apikey/create`, {
        method: 'POST',
      })
      assert_chalk(
        res.ok,
        `Could not create apikey. Ensure BeFast is setup on host ${chalk.gray(
          host
        )}`
      )

      let data = await res.json()
      if (debug) console.log({ data })

      const { code } = data
      refresh = data.refresh
      pathname = data.pathname
      console.log(chalk.gray(`Your code should read: ${code}`))
      console.log(chalk.gray(`Please visit following page to confirm:`))
      console.log()

      let url = `${origin}${pathname}`
      console.log(chalk.cyan.bold(url))
      try {
        await open(url)
      } catch (error) {
        //
      }
    }

    if (debug) console.log('waiting 5 seconds...')
    if (!debug) await new Promise((r) => setTimeout(r, 1000 * 5))

    let apikey
    while (!apikey) {
      try {
        let url = `${origin}/api/apikey/create?refresh=${refresh}`
        if (debug) console.log(url)
        let res = await fetch(url)
        assert(res.ok)
        let data = await res.json()
        if (debug) console.log({ data })

        apikey = data?.apikey
      } catch (error) {
        if (debug) console.error(error)
      }

      if (debug) console.log('waiting 5 seconds...')
      if (!apikey) await new Promise((r) => setTimeout(r, 1000 * 5))
    }

    config_write({ host, apikey })
    console.log(chalk.gray(`${chalk.bold(host)} successfully configured.`))
    process.exit(0)
  }

  assert(host, `Missing host. Run ${chalk.cyan.bold('befast login [host]')}`)
  if (debug) console.log('host configured')

  if (command === 'init') {
    let [name] = command_args
    try {
      assert(name)
    } catch (error) {
      console.log(
        chalk.red(
          `Missing example. Run ${chalk.cyan.bold(
            `befast init ${chalk.green.bold('[name]')}`
          )}`
        )
      )
      console.log(chalk.gray('where [name] is one of:'))
      console.log(chalk.green.bold(`demo`))
      console.log(chalk.green.bold(`static`))
      process.exit(1)
    }

    await git_clone_befast(name)
    console.log(chalk.gray(`${name} created.`))
    console.log(chalk.gray(`You can deploy ${chalk.bold(name)} in two steps:`))
    console.log(chalk.cyan.bold(`cd ${name}`))
    console.log(`${chalk.cyan.bold('befast deploy')} ${chalk.gray('[rename]')}`)
  }

  if (command === 'deploy') {
    let [name] = command_args

    if (!name) {
      let cwd = process.cwd()
      if (debug) console.log({ cwd })
      name = cwd.split('/').at(-1)
      if (debug) console.log({ name })
    }

    assert_chalk(name, 'Missing name')

    let origin = `https://${host}`
    let res = await fetch(`${origin}/api/deploy`, {
      method: 'POST',
      headers: {
        'x-apikey': apikey,
      },
      body: JSON.stringify({
        host,
        name,
      }),
    })

    assert_chalk(res.ok, `Ensure BeFast is setup on host ${chalk.gray(host)}`)
    let json = await res.json()
    if (debug) console.log({ json })
    const { owner, repo, domain } = json

    await git_deploy(owner, repo)

    let url_github = `https://github.com/${owner}/${repo}`
    let url = `https://${host}/${repo}`
    let url_app = `https://${domain}`
    console.log(chalk.gray(url_github))
    console.log(chalk.gray(url))
    console.log(chalk.gray(url_app))

    try {
      await open(url)
    } catch (error) {
      //
    }
    process.exit(0)
  }
}

main()
