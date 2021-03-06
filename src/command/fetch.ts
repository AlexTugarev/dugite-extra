import { git, IGitExecutionOptions } from '../core/git';
import { FetchProgressParser, executionOptionsWithProgress } from '../progress';
import { IFetchProgress } from '../progress';

/**
 * Fetch from the given remote.
 *
 * @param repository - The repository to fetch into
 *
 * @param remote     - The remote to fetch from
 *
 * @param progressCallback - An optional function which will be invoked
 *                           with information about the current progress
 *                           of the fetch operation. When provided this enables
 *                           the '--progress' command line flag for
 *                           'git fetch'.
 */
export async function fetch(repositoryPath: string, remote: string, exec?: IGitExecutionOptions.ExecFunc, progressCallback?: (progress: IFetchProgress) => void): Promise<void> {
    let opts: IGitExecutionOptions = {
        successExitCodes: new Set([0]),
    };
    if (exec) {
        opts = {
            ...opts,
            exec
        };
    }

    if (progressCallback) {
        const title = `Fetching ${remote}`;
        const kind = 'fetch';

        opts = executionOptionsWithProgress(
            opts,
            new FetchProgressParser(),
            progress => {
                // In addition to progress output from the remote end and from
                // git itself, the stderr output from pull contains information
                // about ref updates. We don't need to bring those into the progress
                // stream so we'll just punt on anything we don't know about for now.
                if (progress.kind === 'context') {
                    if (!progress.text.startsWith('remote: Counting objects')) {
                        return;
                    }
                }

                const description = progress.kind === 'progress' ? progress.details.text : progress.text;
                const value = progress.percent;

                progressCallback({ kind, title, description, value, remote });
            }
        )

        // Initial progress
        progressCallback({ kind, title, value: 0, remote });
    }

    const args = progressCallback
        ? ['fetch', '--progress', remote]
        : ['fetch', remote];

    await git(args, repositoryPath, 'fetch', opts);
}

/** Fetch a given refspec from the given remote. */
export async function fetchRefspec(repositoryPath: string, remote: string, refspec: string, exec?: IGitExecutionOptions.ExecFunc): Promise<void> {
    let options: IGitExecutionOptions = {
        successExitCodes: new Set([0, 128])
    };
    if (exec) {
        options = {
            ...options,
            exec
        };
    }
    const args = ['fetch', remote, refspec];
    await git(args, repositoryPath, 'fetchRefspec', options);
}
