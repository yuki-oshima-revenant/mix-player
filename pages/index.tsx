import type { NextPage } from 'next';
import { useRouter } from "next/router";
import { useEffect } from 'react';
import Head from "next/head";

const Home: NextPage = () => {
    const router = useRouter();
    useEffect(() => {
        router.push('/mix/1')
    }, [])
    return (
        <div>
            <Head>
                <title>{`mixplayer.unronritaro.net`}</title>
            </Head>
        </div>
    );

};

export default Home
