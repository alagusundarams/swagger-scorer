import React from 'react';

interface Props {
    productName: string;
    apiName: string;
}

export const ContractBreadcrumb: React.FC<Props> = ({ productName, apiName }) => {
    return (
        <nav className="flex items-center text-sm font-medium mb-1">
            <span className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Inventory
            </span>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900 dark:text-gray-100 font-semibold">
                {productName}
            </span>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">
                {apiName}
            </span>
        </nav>
    );
};
