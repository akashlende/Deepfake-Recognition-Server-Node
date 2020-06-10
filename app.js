const { exec } = require("child_process");
const fs = require("fs");

exec(
  "python -W ignore .\\hello.py -i ./input -m .\\faceforensics++_models_subset\\full\\xception\\full_c40.p --cuda",
  (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    stdout = stdout.replace("\r\n", "");
    let json = fs.readFileSync(stdout);
    console.log("stdout: ", JSON.parse(json));
  }
);
