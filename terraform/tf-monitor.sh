while true; do
  date
  ssh -i ~/.ssh/upscAppAwsKey -o StrictHostKeyChecking=no -l ubuntu   13.234.110.162    docker images
  sleep 60
  echo
  echo
done
