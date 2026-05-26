import '../dummy/dummy_data.dart';
import '../models/work_order_model.dart';

class WorkOrderService {
  Future<List<WorkOrder>> getWorkOrders() async {
    // TODO: Firebase sync sonrası branch bazlı iş emirleri okunacak.
    return DummyData.workOrders;
  }

  Future<WorkOrder> getActiveWorkOrder() async {
    // TODO: Kullanıcı rolüne göre aktif iş emri seçimi yapılacak.
    return DummyData.workOrder;
  }
}
