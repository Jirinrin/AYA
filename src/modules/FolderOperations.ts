import ENV from "../ENV";
import * as path from "path";
import * as fs from "fs";
import { highlightExp, simpleMove } from "../util";
import { doForEach, getEnts } from "../util";
import { RawModule } from "../types";

const FolderOperations: RawModule = {
  flatten: {
    // todo: shorthands for -a / -f ( / -af combined) don't seem to work
    help: 'Flatten folders that only contain one folder | opts: --all(-a), --filesAllowed(-f)',
    noMetadata: true,
    // todo: refactor to simply use iterate so we can also do it deep etc.
    run: async (opts: {all: boolean, filesAllowed: boolean}) => {
      console.log('Start flattening...');

      const tmpPath = path.join(ENV.cwd, '__tmp__');
      if (fs.existsSync(tmpPath))
        console.warn(highlightExp`Caution: ${tmpPath} already exists, it will be emptied in ${ENV.cwd} after flattening.`);
      else
        fs.mkdirSync(tmpPath);

      await doForEach(ENV.cwd, (dir, _) => {
        if (!dir.isDirectory() || dir.path === tmpPath) return;

        const currentFolder = dir.path;
        const ents = getEnts(currentFolder);
        if (ents.length === 0)
          return;

        if (!opts.filesAllowed && ents.some(ent => ent.isFile()))
          return;

        try {
          if (opts.all)
            ents.forEach(nestedEnt => simpleMove(currentFolder, nestedEnt.name, tmpPath));
          else {
            if (ents.length !== 1)
              return;
            simpleMove(currentFolder, ents[0].name, tmpPath);
          }

          fs.rmdirSync(currentFolder);
          console.log(highlightExp`Flattened ${dir.name} -> ${ents.map(e => `"${e.name}"`).join(', ')}`);
        } catch (err) {
          console.error(highlightExp`Flattening ${dir.name} failed:`, err);
        }
      });

      getEnts(tmpPath).forEach(e => simpleMove(tmpPath, e.name, ENV.cwd));
      fs.rmdirSync(tmpPath);
    }
  },
  clean: {
    help: 'Remove empty folders',
    noMetadata: true,
    getRun: iterate => async () => iterate((dir, folder) => {
      if (!dir.isDirectory()) return;

      const dirPath = path.join(folder, dir.name);

      if (fs.readdirSync(dirPath).length) return;

      fs.rmdirSync(dirPath);
      console.log(highlightExp`Removed "${dirPath}"`);
    })
  },
};

export default FolderOperations;