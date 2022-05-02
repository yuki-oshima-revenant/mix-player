import type { NextPage } from 'next';
import Head from "next/head";
import { useRouter } from 'next/router';
import { data } from '../lib/data'
import { ImTwitter, ImGithub } from 'react-icons/im';
import { useIsMobile } from '../lib/utils/useIsMobile';
import { useRef } from 'react';

const Home: NextPage = () => {
    const router = useRouter();
    const isMobile = useIsMobile();
    const ref = useRef<HTMLDivElement>(null);
    return (
        <div ref={ref}>
            <Head>
                <title>{`mixplayer.unronritaro.net`}</title>
                <meta property="og:title" content={`mixplayer.unronritaro.net`} />
                <meta property="og:image" content={`https://mixplayer.unronritaro.net/ogp/top.png`} />
                <meta name="twitter:image" content={`https://mixplayer.unronritaro.net/ogp/top.png`} />
                <meta name="twitter:card" content="summary_large_image" />
            </Head>
            <div className="bg-black text-white w-full">
                <header className="fixed z-[5] flex w-full px-2 lg:px-4 h-12">
                    <div className='flex-grow' />
                    <div className='text-xl flex'>
                        <ImTwitter
                            className="h-auto my-auto cursor-pointer"
                            onClick={() => {
                                window.open('https://twitter.com/Re_venant', '_blank')
                            }}
                        />
                        <ImGithub
                            className="h-auto my-auto ml-2 cursor-pointer"
                            onClick={() => {
                                window.open('https://github.com/yuki-oshima-revenant/mix-player', '_blank')
                            }}
                        />
                    </div>
                </header>
                {/* <h1>mix list</h1> */}
                <div style={{ height: `calc(100vh - 32px)`, minHeight: `calc(${data.length * (isMobile ? 160 : 320)}px + 32px + 32px)` }} className="pt-12 w-full">
                    {
                        data.map((mix, mixIndex) => (
                            <div key={mix.title} className="flex h-[160px] lg:h-[320px] cursor-pointer group" onClick={() => { router.push(`/mix/${mixIndex + 1}`) }}>
                                <div className='z-[3] py-1 px-2 lg:px-4'>
                                    <h2 className='text-3xl lg:text-6xl font-bold tracking-tighter' >
                                        {mix.title}
                                    </h2>
                                    {/* <div className="flex gap-1 lg:gap-2 mt-2">
                                    {mix.genres.map(({ name, color },) => (
                                        <div className={`px-2 font-medium`} key={name} style={{ backgroundColor: color }}>
                                            {name}
                                        </div>
                                    ))}
                                </div> */}
                                    {/* <div className="text-lg mt-2">{mix.time}</div> */}
                                </div>
                                <div className='absolute overflow-hidden'>
                                    <div className='flex h-[160px] lg:h-[320px]' style={{ width: ref.current?.getBoundingClientRect().width }}>
                                        {mix.tracks.map((track, trackIndex) => {
                                            return (
                                                <div key={track.title} className="h-[160px] lg:h-[320px] w-[160px] lg:w-[320px] absolute" style={{ left: trackIndex * (isMobile ? 80 : 160) }}>
                                                    <img src={track.imageLink} className="" />
                                                </div>
                                            )
                                        })}
                                        <div className="h-[160px] lg:h-[320px] absolute w-full z-[2] backdrop-blur-xl group-hover:backdrop-blur-0 duration-150 bg-black/30" />
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>
                <footer className="h-8 text-center">©︎2022 Yuki Oshima</footer>
            </div>
        </div >
    );

};

export default Home
