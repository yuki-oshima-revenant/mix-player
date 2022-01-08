import type { NextPage } from 'next';
import { useRouter } from "next/router";
import { useEffect } from 'react';


const Home: NextPage = () => {
    const router = useRouter();
    useEffect(() => {
        router.push('/mix/1')
    }, [])
    return <></>
};

export default Home
