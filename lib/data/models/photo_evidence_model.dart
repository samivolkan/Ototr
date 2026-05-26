class PhotoEvidence {
  const PhotoEvidence({
    required this.id,
    required this.title,
    required this.isRequired,
    required this.isUploaded,
    required this.uploadQueueLabel,
  });

  final String id;
  final String title;
  final bool isRequired;
  final bool isUploaded;
  final String uploadQueueLabel;
}
