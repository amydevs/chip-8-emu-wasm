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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { KEYPAD, KEYPAD_ORDER } from './lib/utils';

function App() {
  const { getEventLoopLazy, eventLoop } = useEventLoop();
  const parentRef = React.useRef<HTMLDivElement>(document.createElement('div'));

  React.useEffect(() => {
    parentRef.current.className = 'canvas-parent aspect-[2/1] w-full';
    () => {
      eventLoop?.detach();
      parentRef.current.remove();
    }
  }, []);

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

  React.useMemo(() => {
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

  const keydownCb = React.useCallback(async (value: number, pressed: boolean) => {
    (await getEventLoopLazy()).set_key(value, pressed);
  }, [getEventLoopLazy]);

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
      <section className='p-6 min-h-screen gap-6 grid grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-[1fr_auto] lg:grid-rows-1'>
        <div
          tabIndex={0}
          className='rounded-lg p-1 h-full flex items-center'
          style={{
            background: !options.invert_colors ?
              `rgb(${options.bg.r}, ${options.bg.g}, ${options.bg.b})` :
              `rgb(${options.fg.r}, ${options.fg.g}, ${options.fg.b})`,
          }}
          onFocus={() => {
            parentRef.current?.querySelector("canvas")?.focus();
          }}
          ref={ref => ref?.appendChild(parentRef.current)} 
        >
        </div>
        <Tabs defaultValue="options" className='lg:w-80 h-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="gamepad">Gamepad</TabsTrigger>
          </TabsList>
          <TabsContent value="options" className='min-h-[calc(100%-3rem)] relative'>
            <div className='lg:absolute lg:inset-0 lg:overflow-y-auto flex flex-col gap-3'>
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
              <div className='px-3.5'>
              <RgbColorPicker
                title='Foreground Color'
                id='fg'
                className='!w-full !min-h-[200px]'
                color={options.fg}
                onChange={(value) => {
                  setOptions(
                    produce(options, (draft) => {
                      draft.fg = value;
                    })
                  );
                }}
              />
              </div>
              <Label htmlFor='bg'>Background</Label>
              <div className='px-3.5'>
                <RgbColorPicker
                  title='Background Color'
                  className='!w-full !min-h-[200px]'
                  color={options.bg}
                  onChange={(value) => {
                    setOptions(
                      produce(options, (draft) => {
                        draft.bg = value;
                      })
                    );
                  }}
                />
              </div>
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
          </TabsContent>
          <TabsContent value="gamepad" className='h-[calc(100%-3rem)]'>
            <div className='h-full grid grid-cols-4 gap-3'>
              {
                KEYPAD_ORDER.map((key, i) => (
                  <Button
                    className='h-full w-full'
                    key={i}
                    title={key.toString()}
                    onTouchStart={() => keydownCb(KEYPAD[key], true)}
                    onTouchEnd={() => keydownCb(KEYPAD[key], false)}
                    onMouseDown={() => keydownCb(KEYPAD[key], true)}
                    onMouseUp={() => keydownCb(KEYPAD[key], false)}
                  >
                    {key.toString()}
                  </Button>
                ))
              }
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}

export default App
