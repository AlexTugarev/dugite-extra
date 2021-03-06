import { git, GitError, IGitExecutionOptions } from '../core/git';
import { PullProgressParser, executionOptionsWithProgress } from '../progress';
import { IPullProgress } from '../progress';

/**
 * Pull from the specified remote.
 *
 * @param repository - The repository in which the pull should take place
 *
 * @param remote     - The name of the remote that should be pulled from
 *
 * @param branch     - The name of the branch to pull from. It is required when pulling from a remote which is
 *                      not the default remote tracking of the currently active branch.
 *
 * @param progressCallback - An optional function which will be invoked
 *                           with information about the current progress
 *                           of the pull operation. When provided this enables
 *                           the '--progress' command line flag for
 *                           'git pull'.
 */
export async function pull(
    repositoryPath: string,
    remote: string,
    branch?: string,
    exec?: IGitExecutionOptions.ExecFunc,
    progressCallback?: (progress: IPullProgress) => void): Promise<void> {

    let opts: IGitExecutionOptions = {};
    if (exec) {
        opts = {
            ...opts,
            exec
        };
    }

    if (progressCallback) {
        const title = `Pulling ${remote}`;
        const kind = 'pull';

        opts = executionOptionsWithProgress(
            opts,
            new PullProgressParser(),
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
        );

        // Initial progress
        progressCallback({ kind, title, value: 0, remote })
    }

    const args = ['pull', remote];

    if (branch) {
        args.push(branch)
    }

    if (progressCallback) {
        args.push('--progress');
    }

    const result = await git(args, repositoryPath, 'pull', opts);

    if (result.gitErrorDescription) {
        throw new GitError(result, args);
    }
}
