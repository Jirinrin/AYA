call yarn compile:win
cd bin && call 7za a win-x64.zip aya.exe && del aya.exe && cd ..

call yarn compile:linux
cd bin && call 7za a linux-x64.zip aya && del aya && cd ..

call yarn compile:macos
cd bin && call 7za a macos-x64.zip aya && del aya && cd ..
