import Document, { Html, Head, Main, NextScript } from 'next/document'

class Index extends Document {
    render() {
        return (
            <Html lang="ja">
                <Head>
                    <meta name="robots" content="noindex" />
                    <meta property="og:url" content="https://mixplayer.unronritaro.net" />
                    <meta property="og:type" content="website" />
                    <meta property="og:description" content="DJ Mix Player Web Application / Mixed and written by Revenant(Yuki Oshima)" />
                    <meta property="og:site_name" content="mixplayer.unronritaro.net" />
                    <meta name="description" content="DJ Mix Player Web Application / Mixed and written by Revenant(Yuki Oshima)"></meta>
                </Head>
                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        )
    }
};

export default Index;