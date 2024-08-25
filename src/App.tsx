import * as React from 'react';
import type { Options } from 'chip-8-emu';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Input } from './components/ui/input';
import { Toggle } from './components/ui/toggle';
import { Upload } from "lucide-react"

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

  const romQuery = useQuery({
    queryKey: ['rom', selectedRom],
    queryFn: async () => {
      let response = await fetch(selectedRom);
      await import('chip-8-emu');
      return new Uint8Array(await response.arrayBuffer());
    },
    refetchOnWindowFocus: false,
    enabled: false,
  });

  let [isUploadRom, setIsUploadRom] = React.useState(false);

  return (
    <main>
      <section className='p-6 min-h-screen flex items-center'>
        <div className='flex-1 flex flex-col md:flex-row gap-6'>
          <div
            tabIndex={0}
            className='flex-1 flex rounded-lg overflow-hidden p-1'
            style={{
              background: !options.invert_colors ?
                `rgb(${options.bg.r}, ${options.bg.g}, ${options.bg.b})` :
                `rgb(${options.fg.r}, ${options.fg.g}, ${options.fg.b})`,
            }}
            onFocus={() => {
              parentRef.current?.querySelector("canvas")?.focus();
            }}
          >
            <div className='flex-1 my-auto'>
              <div ref={parentRef} className='canvas-parent aspect-[2/1]' />
            </div>
          </div>
          <div className='flex flex-col gap-3 md:w-64'>
            <Label htmlFor='rom'>Rom</Label>
            <div id='rom' className='flex'>
              {
                !isUploadRom ?
                  <Select value={selectedRom} onValueChange={setSelectedRom}>
                    <SelectTrigger title='Select Rom'>
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
                  </Select> :
                  <Input
                    title='Upload Rom'
                    type='file'
                    placeholder='Upload Rom'
                    onChange={(event) => {
                      const files = event.target.files;
                      if (files != null && files[0] != null) {
                        const file = files[0];
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => {
                          setSelectedRom(reader.result as string);
                        }
                      }
                    }}
                  />
              }
              <Toggle title='Enable Upload Rom' pressed={isUploadRom} onPressedChange={setIsUploadRom}>
                <Upload className='h-4 w-4' />
              </Toggle>
            </div>
            <div className='flex gap-3'>
              <Button
                title='Play'
                className='flex-1'
                onClick={async () => {
                  const response = await romQuery.refetch();
                  if (response.data != null) {
                    const { WasmMainLoop } = await import('chip-8-emu');
                    const mainLoop = await WasmMainLoop.create(parentRef.current!, response.data, options);
                    (await getEventLoopLazy()).attach(mainLoop);
                  }
                }}
                disabled={romQuery.isLoading}
              >
                { !romQuery.isLoading ? "Play" : "Loading" }
              </Button>
              <Button
                title='Stop'
                className='flex-1'
                onClick={async () => {
                  (await getEventLoopLazy()).detach();
                }}
              >
                Stop
              </Button>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button title='Open Controls'>Controls</Button>
              </DialogTrigger>
              <DialogContent className="max-w-[300px] rounded-lg">
                <DialogHeader>
                  <DialogTitle>Controls</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <pre>
                    {               
`Keypad:        Keyboard:
---------      ---------
|1|2|3|C|      |1|2|3|4|
---------      ---------
|4|5|6|D|      |Q|W|E|R|
---------  =>  ---------
|7|8|9|E|      |A|S|D|F|
---------      ---------
|A|0|B|F|      |Z|X|C|V|
---------      ---------
`
                    }
                  </pre>
                </div>
              </DialogContent>
            </Dialog>
            <Label htmlFor='hz'>Speed (hz)</Label>
            <Slider
              title='Speed (hz)'
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
              title='Volume'
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
              title='Foreground Color'
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
              title='Background Color'
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
              title='Invert Colors'
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
      </section>
    </main>
  )
}

export default App
