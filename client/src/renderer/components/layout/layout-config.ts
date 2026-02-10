import { IJsonModel } from 'flexlayout-react';

export const defaultLayout: IJsonModel = {
    global: {
        tabEnableClose: true,
        tabEnableRename: false,
        tabSetEnableMaximize: true,
        // @ts-ignore
        tabSetTabStripHeight: 32,
        borderBarSize: 32,
        splitterSize: 6, // Larger hit area, visual will be thinner
        tabSetMinHeight: 32,
        tabSetMinWidth: 32,
    },
    borders: [],
    layout: {
        type: "row",
        weight: 100,
        children: [
            {
                type: "tabset",
                weight: 15,
                enableClose: false,
                id: "sidebar-panel",
                children: [
                    {
                        type: "tab",
                        name: "SIDEBAR",
                        component: "sidebar",
                        enableClose: false,
                        id: "sidebar",
                        // @ts-ignore
                        icon: "sidebar"
                    }
                ]
            },
            {
                type: "tabset",
                weight: 60,
                selected: 0,
                id: "stage-panel",
                enableClose: true,
                children: [
                    {
                        type: "tab",
                        name: "Chat",
                        component: "stage",
                        enableClose: true,
                        id: "stage",
                        // @ts-ignore
                        icon: "stage"
                    }
                ]
            },
            {
                type: "tabset",
                weight: 25,
                id: "inspector-panel",
                children: [
                    {
                        type: "tab",
                        name: "INSPECTOR",
                        component: "inspector",
                        enableClose: true,
                        id: "inspector",
                        // @ts-ignore
                        icon: "inspector"
                    }
                ]
            }
        ]
    }
};
