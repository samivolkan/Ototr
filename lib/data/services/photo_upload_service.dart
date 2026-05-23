class PhotoUploadService {
  Future<String> queueUpload(String localPath) async {
    // TODO: Firebase Storage upload queue ve offline retry mekanizması.
    return 'Fotoğraf yükleme kuyruğu: $localPath';
  }
}
