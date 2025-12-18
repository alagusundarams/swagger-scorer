
import { Header } from '../../layouts/Header/Header.view';
import { Breadcrumbs } from '../../layouts/MainLayout/Breadcrumbs';
import { Footer } from '../../layouts/Footer/Footer.view';

export const HeaderFooterTest = () => {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <Breadcrumbs />

            {/* Main content area - placeholder */}
            <main className="flex-1 p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Header & Footer Test Page</h1>
                    <p className="text-gray-600 mb-8">
                        Testing Header and Footer components.
                    </p>

                    {/* Sample content to show spacing */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-2">Sample Card 1</h3>
                            <p className="text-sm text-gray-600">Content to test layout spacing</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-2">Sample Card 2</h3>
                            <p className="text-sm text-gray-600">Content to test layout spacing</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-2">Sample Card 3</h3>
                            <p className="text-sm text-gray-600">Content to test layout spacing</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};
