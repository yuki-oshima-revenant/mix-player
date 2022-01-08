import type { NextPage } from 'next';
import { GetStaticProps } from 'next';


export const getStaticProps: GetStaticProps<{}> = async ({ params, preview }) => {
    return {
        props: {
        },
        redirect: {
            destination: '/mix/1'
        }
    };
}

const Home: NextPage = () => {
    return <></>
};

export default Home
