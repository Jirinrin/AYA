import ENV from "../ENV";
import * as path from "path";
import * as fs from "fs";
import { simpleMove } from "../util";
import { doForEach, getEnts } from "../util";
import { RawModule } from "../types";

const FolderOperations: RawModule = {
  flatten: {
    help: 'Flatten folders that only contain one folder | opts: --all(-a), --allowFiles(-f)',
    run: async (opts: {all: boolean, allowFiles: boolean}) => {
      console.log('Start flattening...');

      await doForEach(ENV.cwd, (dir, folder) => {
        if (!dir.isDirectory()) return;

        const currentFolder = path.join(folder, dir.name);
        const ents = getEnts(currentFolder);
        if (ents.length === 0)
          return;

        if (!opts.allowFiles && ents.some(ent => ent.isFile()))
          return;
        
        if (opts.all)
          ents.forEach(nestedEnt => simpleMove(currentFolder, nestedEnt.name, folder));
        else {
          if (ents.length !== 1)
            return;
          simpleMove(currentFolder, ents[0].name, folder);
        }

        try {
          fs.rmdirSync(currentFolder);
          console.log(`Flattened ${dir.name} -> ${ents.map(e => `"${e.name}"`).join(', ')}`);
        } catch (err) {
          console.error(`Flattening ${dir.name} failed:`, err);
        }
      });
    }
  },
  clean: {
    help: 'Remove empty folders',
    getRun: iterate => async () => iterate((dir, folder) => {
      if (!dir.isDirectory()) return;

      const dirPath = path.join(folder, dir.name);

      if (fs.readdirSync(dirPath).length) return;

      fs.rmdirSync(dirPath);
      console.log(`Removed ${dirPath}`);
    })
  },
};

export default FolderOperations;