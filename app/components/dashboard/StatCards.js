import { COMMON_STYLES } from '../../constants/dashboard';

export function StatCards({ overallData }) {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className={COMMON_STYLES.card}>
                    <h3 className={COMMON_STYLES.title}>Current data</h3>
                    <p className={`${COMMON_STYLES.value} text-blue-600`}>{overallData?.total}</p>
                </div>
                <div className={COMMON_STYLES.card}>
                    <h3 className={COMMON_STYLES.title}>Overall data</h3>
                    <p className={`${COMMON_STYLES.value} text-green-600`}>
                        {overallData?.overallData || 0}
                    </p>
                </div>
                <div className={COMMON_STYLES.card}>
                    <h3 className={COMMON_STYLES.title}>OPD 24 hour</h3>
                    <p className={`${COMMON_STYLES.value} text-green-600`}>{overallData.summaryData.opdTotal24hr}</p>
                </div>
                <div className={COMMON_STYLES.card}>
                    <h3 className={COMMON_STYLES.title}>Admission Rate</h3>
                    <p className={`${COMMON_STYLES.value} text-purple-600`}>{overallData.calculations.admissionRate}%</p>
                    <p className="text-sm text-gray-600">Patient Census x 100 / OPD 24 hour</p>
                </div>
                <div className={COMMON_STYLES.card}>
                    <h3 className={COMMON_STYLES.title}>Conversion Ratio</h3>
                    <p className={`${COMMON_STYLES.value} text-orange-600`}>{overallData.calculations.conversionRatio}</p>
                    <p className="text-sm text-gray-600">OPD 24 hour / Patient Census</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className={COMMON_STYLES.card}>
                    <h3 className={COMMON_STYLES.title}>Old Patient</h3>
                    <p className={`${COMMON_STYLES.value} text-gray-700`}>{overallData.summaryData.existingPatients}</p>
                </div>
                <div className={COMMON_STYLES.card}>
                    <h3 className={COMMON_STYLES.title}>New Patient</h3>
                    <p className={`${COMMON_STYLES.value} text-gray-700`}>{overallData.summaryData.newPatients}</p>
                </div>
                <div className={COMMON_STYLES.card}>
                    <h3 className={COMMON_STYLES.title}>Admit 24 hour</h3>
                    <p className={`${COMMON_STYLES.value} text-gray-700`}>{overallData.summaryData.admissions24hr}</p>
                </div>
            </div>
        </>
    );
}
