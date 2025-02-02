export const WARD_LIST = [
    'Ward6', 'Ward7', 'Ward8', 'Ward9', 'WardGI',
    'Ward10B', 'Ward11', 'Ward12', 'ICU', 'CCU',
    'LR', 'NSY'
];

export const SHIFT_LIST = ['07:00-19:00', '19:00-07:00'];

export const CHART_COLORS = {
    background: [
        'rgba(255, 182, 193, 0.6)', // pink
        'rgba(255, 218, 185, 0.6)', // peach
        'rgba(152, 251, 152, 0.6)', // pale green
        'rgba(135, 206, 250, 0.6)', // light blue
        'rgba(221, 160, 221, 0.6)', // plum
        'rgba(255, 255, 153, 0.6)', // light yellow
        'rgba(176, 224, 230, 0.6)', // powder blue
        'rgba(255, 160, 122, 0.6)', // light salmon
    ],
    border: [
        'rgb(255, 182, 193)',
        'rgb(255, 218, 185)',
        'rgb(152, 251, 152)',
        'rgb(135, 206, 250)',
        'rgb(221, 160, 221)',
        'rgb(255, 255, 153)',
        'rgb(176, 224, 230)',
        'rgb(255, 160, 122)',
    ]
};

export const COMMON_STYLES = {
    headerCell: "border p-2 text-center whitespace-nowrap",
    dataCell: "border border-gray-200 p-2 text-center text-black",
    inputCell: "w-full text-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded",
    card: "bg-white p-4 rounded-lg shadow-md",
    title: "text-lg font-semibold mb-2 text-gray-800",
    value: "text-3xl font-bold",
    chartContainer: "bg-white p-4 rounded-lg shadow-md h-[400px]"
};
