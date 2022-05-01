import type { NextPage } from 'next';
import { useRouter } from "next/router";
import { useEffect } from 'react';
import Head from "next/head";

const Home: NextPage = () => {
    const router = useRouter();
    useEffect(() => {
        router.push('/mix/3')
    }, [])
    return (
        <div>
            <Head>
                <title>{`mixplayer.unronritaro.net`}</title>
                <meta property="og:title" content={`mixplayer.unronritaro.net`} />
                <meta name="twitter:card" content="summary" />
            </Head>
        </div>
    );

};

export default Home
