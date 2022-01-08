import Document, { Html, Head, Main, NextScript } from 'next/document'

class Index extends Document {
    render() {
        return (
            <Html lang="ja">
                <Head>
                    <meta name="robots" content="noindex" />
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