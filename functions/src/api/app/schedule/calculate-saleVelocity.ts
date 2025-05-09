import {SyncData} from '../firestore/types';

const calculateSaleVelocity = (
  data: SyncData['orders'],
  lookbackDaysForDaily = 7,
  lookbackWeeksForWeekly = 4,
  lookbackMonths = 3,
  lookbackYears = 1,
): SyncData['sale_velocity'] => {
  if (!data || data.length === 0) {
    return undefined;
  }

  // // --- Tìm ngày processedAt mới nhất trong dữ liệu (có thể xóa đi nếu không dùng) ---
  // let latestProcessedAt = new Date(0); // Khởi tạo với ngày sớm nhất có thể
  // for (const order of data) {
  //   const currentProcessedDate = new Date(order.processedAt);
  //   if (currentProcessedDate > latestProcessedAt) {
  //     latestProcessedAt = currentProcessedDate;
  //   }
  // }

  // // Sử dụng ngày processedAt mới nhất làm điểm kết thúc (endDate) cho các lookback
  // const endDate = new Date;

  // Lấy ngày giờ hiện tại
  const endDate = new Date(); // Sử dụng thời điểm hiện tại làm mốc cuối

  // --- Tính toán ngày bắt đầu dựa trên endDate ---
  const startDateDaily = new Date(endDate);
  startDateDaily.setDate(endDate.getDate() - lookbackDaysForDaily);

  const startDateWeekly = new Date(endDate);
  startDateWeekly.setDate(endDate.getDate() - lookbackWeeksForWeekly * 7);

  const startDateMonthly = new Date(endDate);
  startDateMonthly.setMonth(endDate.getMonth() - lookbackMonths);

  const startDateYearly = new Date(endDate);
  startDateYearly.setFullYear(endDate.getFullYear() - lookbackYears);

  // --- Khởi tạo tổng số lượng ---
  let totalQuantityDaily = 0;
  let totalQuantityWeekly = 0;
  let totalQuantityMonthly = 0;
  let totalQuantityYearly = 0;

  // --- Duyệt qua các đơn hàng và tính tổng số lượng trong các khoảng thời gian ---
  for (const order of data) {
    const processedDate = new Date(order.processedAt);

    // Kiểm tra xem đơn hàng có nằm trong các khoảng thời gian lookback không
    // Điểm kết thúc (endDate) bây giờ là bao gồm (<=) vì nó là một điểm dữ liệu hợp lệ
    if (processedDate >= startDateDaily && processedDate <= endDate) {
      totalQuantityDaily += order.quantity;
    }
    if (processedDate >= startDateWeekly && processedDate <= endDate) {
      totalQuantityWeekly += order.quantity;
    }
    if (processedDate >= startDateMonthly && processedDate <= endDate) {
      totalQuantityMonthly += order.quantity;
    }
    if (processedDate >= startDateYearly && processedDate <= endDate) {
      totalQuantityYearly += order.quantity;
    }
  }

  // --- Tính toán vận tốc bán hàng trung bình (tránh chia cho 0) ---
  const dailySaleVelocity = lookbackDaysForDaily > 0 ? totalQuantityDaily / lookbackDaysForDaily : 0;
  const weeklySaleVelocity = lookbackWeeksForWeekly > 0 ? totalQuantityWeekly / lookbackWeeksForWeekly : 0;
  const monthlySaleVelocity = lookbackMonths > 0 ? totalQuantityMonthly / lookbackMonths : 0;
  const yearlySaleVelocity = lookbackYears > 0 ? totalQuantityYearly / lookbackYears : 0;

  // Trả về kết quả
  return {
    daily: Number(dailySaleVelocity.toFixed(2)),
    weekly: Number(weeklySaleVelocity.toFixed(2)),
    monthly: Number(monthlySaleVelocity.toFixed(2)),
    yearly: Number(yearlySaleVelocity.toFixed(2)),
    calculation_end_date: endDate.toISOString(),
  };
};

export default calculateSaleVelocity;
