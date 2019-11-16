# Picture collection manipulator

How to use this CLI thingy:
- to run a command you need to prefix it with a `.`
- use `.help` to know all the commands
- use `.helpp {command}` to get help for a specific command
- apparently tab completion is a thing for commands
- sometimes / most times after a command is finished executing, you'll need to press Enter so you get to a new line starting with `>` again  
  (most tasks are done asynchronously, and it's too much of a bother to go check properly when everything is finished)
- if you want you can just press Enter on the first 'what folder' question

Picture manipulation relevant commands:
- `.move-to`: move tagged pictures to tag folders
- `.move-fro`: move pictures from tag folders to shared folders
- `.config`: the programme will use move-to and move-fro to move to a certain pre-set display config
  - Current available macros: 
    - meh (both meh and neh are shown)
    - neh (neh is showed, meh is hidden)
    - 0 (both meh and neh are hidden)
- You can supply an argument after either of these commands to specify pictures with what tag you want to move
- `.reset-tags`: [USE WITH CAUTION] will make sure that files in root folders have no tags and that files in tag folders have the tag that matches their folder.

Misc fun/useful commands:
- `.count-visible-pictures`: allows you to see how large the currently visible (i.e. not stashed away in tag folders) picture collection is

## How to build exe
- Have pkg installed (`npm install -g pkg`)
- Run the "compile" npm script
