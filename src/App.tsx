import * as React from 'react';
import { Options, WasmMainLoop } from 'chip-8-emu';
import { useEventLoop } from './store';
import { Octokit } from 'octokit';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './components/ui/select';
import { Button } from './components/ui/button';
import { Slider } from './components/ui/slider';
import { produce } from 'immer';
import { Switch } from './components/ui/switch';
import { RgbColorPicker } from 'react-colorful';
import { Label } from './components/ui/label';

function App() {
  const { getEventLoopLazy, eventLoop } = useEventLoop();
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [options, setOptions] = React.useState<Required<Options>>({
    invert_colors: false,
    hz: 500,
    vol: 1.0,
    bg: {
      r: 0,
      g: 0,
      b: 0,
    },
    fg: {
      r: 255,
      g: 255,
      b: 255,
    },
  });

  React.useEffect(() => {
    eventLoop?.set_options(options);
  }, [options]);

  const romListQuery = useQuery({
    queryKey: ['romList'],
    queryFn: async () => {
      const octokit = new Octokit();
      const data = await octokit.rest.repos.getContent({
        owner: 'dmatlack',
        repo: 'chip8',
        path: "roms/games"
      });
      if (!Array.isArray(data.data)) {
        throw new Error("Incorrect response from GitHub");
      }
      return data
        .data
        .filter((e) => e.type === "file" && e.name.endsWith(".ch8"));
    }
  });
  let [selectedRom, setSelectedRom] = React.useState("https://raw.githubusercontent.com/dmatlack/chip8/master/roms/games/Airplane.ch8");
  return (
    <main className='p-6 min-h-screen flex items-center'>
      <div className='flex-1 flex flex-col md:flex-row gap-6'>
        <div
          className='flex-1 flex rounded overflow-hidden p-1'
          style={{
            background: `rgb(${options.bg.r}, ${options.bg.g}, ${options.bg.b})`,
          }}
        >
          <div className='flex-1 my-auto'>
            <div ref={parentRef} className='canvas-parent aspect-[2/1]' />
          </div>
        </div>
        <div className='flex flex-col gap-3 md:w-64'>
          <Label htmlFor='rom'>Roms</Label>
          <Select value={selectedRom} onValueChange={setSelectedRom}>
            <SelectTrigger id='rom'>
              <SelectValue placeholder="Select a Rom" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Roms</SelectLabel>
                {
                  romListQuery.data != null ? romListQuery.data?.map((rom, i) => (
                    <SelectItem key={i} value={rom.download_url!}>{rom.name}</SelectItem>
                  )) : <SelectItem value={selectedRom}>Airplane.ch8</SelectItem>
                }
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            onClick={async () => {
              let response = await fetch(selectedRom);
              const mainLoop = await WasmMainLoop.create(parentRef.current!, new Uint8Array(await response.arrayBuffer()), options);
              (await getEventLoopLazy()).attach(mainLoop);
            }}
          >
            Play
          </Button>
          <Button
            onClick={async () => {
              (await getEventLoopLazy()).detach();
            }}
          >
            Stop
          </Button>
          <Label htmlFor='hz'>Speed (hz)</Label>
          <Slider
            id='hz'
            value={[options.hz]}
            onValueChange={(value) => {
              setOptions(
                produce(options, (draft) => {
                  draft.hz = value[0]!;
                })
              );
            }}
            min={1}
            max={1000}
            step={1}
          />
          <Label htmlFor='volume'>Volume</Label>
          <Slider
            id='volume'
            value={[options.vol]}
            onValueChange={(value) => {
              setOptions(
                produce(options, (draft) => {
                  draft.vol = value[0]!;
                })
              );
            }}
            min={0}
            max={1}
            step={0.1}
          />
          <Label htmlFor='fg'>Foreground</Label>
          <RgbColorPicker
            id='fg'
            className='!w-full'
            color={options.fg}
            onChange={(value) => {
              setOptions(
                produce(options, (draft) => {
                  draft.fg = value;
                })
              );
            }}
          />
          <Label htmlFor='bg'>Background</Label>
          <RgbColorPicker
            className='!w-full'
            color={options.bg}
            onChange={(value) => {
              setOptions(
                produce(options, (draft) => {
                  draft.bg = value;
                })
              );
            }}
          />
          <Label htmlFor='invert_colors'>Invert Colors</Label>
          <Switch
            checked={options.invert_colors}
            onCheckedChange={(value) => {
              setOptions(
                produce(options, (draft) => {
                  draft.invert_colors = value;
                })
              );
            }}
          />
        </div>
      </div>
    </main>
  )
}

export default App
