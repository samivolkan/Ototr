<?php
$root=dirname(__DIR__);
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if(str_starts_with($path,'/web/')&&is_file($root.$path)&&!str_ends_with($path,'.php'))return false;
if(str_starts_with($path,'/web')){require $root.'/web/index.php';return true;}
http_response_code(404);echo 'Not found';
