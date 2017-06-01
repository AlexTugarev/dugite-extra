import { git, envForAuthentication, IGitExecutionOptions, gitNetworkArguments } from '../util/git'
import { RepositoryPath } from '../model/repository'
import { Account } from '../model/account'
import { IFetchProgress, FetchProgressParser, executionOptionsWithProgress } from '../progress'

/**
 * Fetch from the given remote.
 * 
 * @param repositoryPath - The repository to fetch into. Or the FS path to the repository.
 * 
 * @param account    - The account to use when authenticating with the remote
 *
 * @param remote     - The remote to fetch from
 *
 * @param progressCallback - An optional function which will be invoked
 *                           with information about the current progress
 *                           of the fetch operation. When provided this enables
 *                           the '--progress' command line flag for
 *                           'git fetch'.
 */
export async function fetch(repositoryPath: RepositoryPath, account: Account | undefined, remote: string, progressCallback?: (progress: IFetchProgress) => void): Promise<void> {
    let opts: IGitExecutionOptions = {
        successExitCodes: new Set([0]),
        env: envForAuthentication(account),
    }

    if (progressCallback) {
        const title = `Fetching ${remote}`
        const kind = 'fetch'

        opts = executionOptionsWithProgress(opts, new FetchProgressParser(), (progress) => {
            // In addition to progress output from the remote end and from
            // git itself, the stderr output from pull contains information
            // about ref updates. We don't need to bring those into the progress
            // stream so we'll just punt on anything we don't know about for now. 
            if (progress.kind === 'context') {
                if (!progress.text.startsWith('remote: Counting objects')) {
                    return
                }
            }

            const description = progress.kind === 'progress'
                ? progress.details.text
                : progress.text
            const value = progress.percent

            progressCallback({ kind, title, description, value, remote })
        })

        // Initial progress
        progressCallback({ kind, title, value: 0, remote })
    }

    const args = progressCallback
        ? [...gitNetworkArguments, 'fetch', '--progress', '--prune', remote]
        : [...gitNetworkArguments, 'fetch', '--prune', remote]

    await git(args, RepositoryPath.getPath(repositoryPath), 'fetch', opts)
}

/**
 * Fetch a given refspec from the given remote.
 * 
 * @param repositoryPath the repository or its FS path.
 * @param account the optional account if required.
 * @param remote the remote name.
 * @param refspec the ref to fetch.
 */
export async function fetchRefspec(repositoryPath: RepositoryPath, account: Account | undefined, remote: string, refspec: string): Promise<void> {
    const options = {
        successExitCodes: new Set([0, 128]),
        env: envForAuthentication(account),
    }

    const args = [
        ...gitNetworkArguments,
        'fetch', remote, refspec,
    ]

    await git(args, RepositoryPath.getPath(repositoryPath), 'fetchRefspec', options)
}
