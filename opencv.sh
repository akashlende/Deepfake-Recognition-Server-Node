OPENCV_VERSION=4.3.0

cd

apt-get update
apt-get remove -y ffmpeg x264 libx264-dev

apt-get install -y \
    build-essential \
    cmake \
    libjack-jackd2-dev \
    libmp3lame-dev \
    libopencore-amrnb-dev \
    libopencore-amrwb-dev \
    libsdl1.2-dev \
    libtheora-dev \
    libva-dev \
    libvdpau-dev \
    libvorbis-dev \
    libx11-dev \
    libxfixes-dev \
    libxvidcore-dev \
    texi2html \
    zlib1g-dev \
    wget \
    unzip \
    yasm \
    pkg-config \
    libswscale-dev \
    libtbb2 \
    libtbb-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libavformat-dev \
		libpq-dev

apt-get remove -y x264 ffmpeg libx264-dev && \
apt-get install -y x264 libx264-dev && \
apt-get install -y ffmpeg

wget https://github.com/opencv/opencv/archive/$OPENCV_VERSION.zip && \
    unzip $OPENCV_VERSION.zip && \
    mkdir opencv-$OPENCV_VERSION/build

cd opencv-$OPENCV_VERSION/build

cmake \
  -DBUILD_TIFF=ON \
  -DBUILD_opencv_java=OFF \
  -DWITH_CUDA=OFF \
  -DWITH_OPENGL=ON \
  -DWITH_OPENCL=ON \
  -DWITH_IPP=ON \
  -DWITH_TBB=ON \
  -DWITH_EIGEN=ON \
  -DWITH_V4L=ON \
  -DBUILD_TESTS=OFF \
  -DBUILD_PERF_TESTS=OFF \
  -DCMAKE_BUILD_TYPE=RELEASE \
  -DCMAKE_INSTALL_PREFIX=$(python -c "import sys; print(sys.prefix)") \
  -DPYTHON_EXECUTABLE=$(which python) \
  -DPYTHON_INCLUDE_DIR=$(python -c "from distutils.sysconfig import get_python_inc; print(get_python_inc())") \
  -DPYTHON_PACKAGES_PATH=$(python -c "from distutils.sysconfig import get_python_lib; print(get_python_lib())") \
  -DPYTHON_DEFAULT_EXECUTABLE=$(which python) \
  -DBUILD_NEW_PYTHON_SUPPORT=ON \
  -DBUILD_opencv_python3=ON \
  -DHAVE_opencv_python3=ON \
  -DBUILD_opencv_gapi=OFF \
  -DPYTHON3_NUMPY_INCLUDE_DIRS=~/anaconda3/envs/deepfake/lib/python3.6/site-packages/numpy/core/include \
  .. \
 && make install

 cp ./lib/python3/cv2.cpython-36m-x86_64-linux-gnu.so ~/anaconda3/envs/deepfake/lib/python3.6/site-packages/cv2.so

 apt clean