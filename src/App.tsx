import * as React from 'react';
import { WasmMainLoop } from 'chip-8-emu';
import { useEventLoop } from './store';
import { Octokit } from 'octokit';
import { useQuery } from '@tanstack/react-query';

function App() {
  const { getEventLoopLazy } = useEventLoop();
  const [octokit] = React.useState(() => new Octokit());
  const parentRef = React.useRef<HTMLDivElement>(null);
  const romListQuery = useQuery({
    queryKey: ['romList'],
    queryFn: async () => {
      return octokit.rest.repos.getContent({
        owner: 'dmatlack',
        repo: 'chip8',
        path: "roms/games"
      });
    }
  });
  return (
    <>
      <button onClick={async () => {
        await romListQuery.refetch();
        let list = romListQuery.data!.data;
        if (!Array.isArray(list)) {
          return;
        }
        let url = list[0].download_url!;
        let response = await fetch(url);
        const mainLoop = await WasmMainLoop.create(parentRef.current!, new Uint8Array(await response.arrayBuffer()), {});
        (await getEventLoopLazy()).attach(mainLoop);
      }}>hi</button>
      <button onClick={async () => {
        (await getEventLoopLazy()).detach();
      }}>bye</button>
      <div ref={parentRef}>
      </div>
    </>
  )
}

export default App
