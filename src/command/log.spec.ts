import * as fs from 'fs';
import * as temp from 'temp';
import * as Path from 'path';
import { stage } from './stage';
import { expect } from 'chai';
import { getStatus } from './status';
import { createCommit } from './commit';
import { logCommitSHAs } from './log';
import { createTestRepository } from './test-helper';

const track = temp.track();

describe('log', async () => {

    after(async () => {
        track.cleanupSync();
    });

    it('logCommitSHAs', async () => {
        const repositoryPath = track.mkdirSync('test-repo-path');
        await createTestRepository(repositoryPath);
        const fileName = Path.join(repositoryPath, 'A.txt');
        expect(await logCommitSHAs(repositoryPath, fileName)).to.be.lengthOf(1);

        fs.writeFileSync(fileName, 'second commit', { encoding: 'utf8' });
        expect(fs.readFileSync(fileName, { encoding: 'utf8' })).to.be.equal('second commit');
        await stage(repositoryPath, fileName);
        expect((await getStatus(repositoryPath)).workingDirectory.files.filter(f => f.staged)).to.be.lengthOf(1);
        await createCommit(repositoryPath, 'second');
        expect((await getStatus(repositoryPath)).workingDirectory.files.filter(f => f.staged)).to.be.empty;

        expect(await logCommitSHAs(repositoryPath, fileName)).to.be.lengthOf(2);

        fs.writeFileSync(fileName, 'third commit', { encoding: 'utf8' });
        expect(fs.readFileSync(fileName, { encoding: 'utf8' })).to.be.equal('third commit');
        await stage(repositoryPath, fileName);
        expect((await getStatus(repositoryPath)).workingDirectory.files.filter(f => f.staged)).to.be.lengthOf(1);
        await createCommit(repositoryPath, 'third');
        expect((await getStatus(repositoryPath)).workingDirectory.files.filter(f => f.staged)).to.be.empty;

        expect(await logCommitSHAs(repositoryPath, fileName)).to.be.lengthOf(3);
    });

});
